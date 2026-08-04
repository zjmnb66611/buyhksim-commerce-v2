import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import ExcelJS from "exceljs";
import { createHash, randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { batchImportRowSchema } from "@buyhksim/contracts";
import { DB_CLIENT } from "../../shared/database.module";
import { IdempotencyService } from "../../shared/idempotency.service";

type ParsedRow = ReturnType<typeof batchImportRowSchema.parse>;
type RowError = { row: number; field: string; message: string };
@Injectable()
export class ImportsService {
  constructor(
    private readonly idem: IdempotencyService,
    @Inject(DB_CLIENT) private readonly client: Sql | null,
  ) {}
  private db() {
    if (!this.client)
      throw new ServiceUnavailableException("商品导入数据库尚未配置");
    return this.client;
  }
  async validate(key: string, merchantId: string, file?: Express.Multer.File) {
    if (!merchantId) throw new BadRequestException("当前账户未绑定商户");
    if (!file) throw new BadRequestException("缺少导入文件");
    const digest = createHash("sha256").update(file.buffer).digest("hex");
    return this.idem.execute(
      `product-import-validate:${merchantId}`,
      key,
      { filename: file.originalname, size: file.size, digest },
      async () => {
        const { rows, errors, totalRows } = await this.parse(file);
        const sql = this.db();
        const duplicateErrors: RowError[] = [];
        if (rows.length) {
          const codes = rows.map(({ value }) => value.skuCode);
          const externalIds = rows.map(({ value }) => value.externalId);
          const existing = await sql<
            Array<{ sku_code: string | null; external_id: string | null }>
          >`select s.code as sku_code,null::text as external_id from skus s join products p on p.id=s.product_id where p.merchant_id=${merchantId} and s.code in ${sql(codes)} union all select null::text,source_external_id from products where merchant_id=${merchantId} and source_external_id in ${sql(externalIds)}`;
          for (const row of rows) {
            if (existing.some((item) => item.sku_code === row.value.skuCode))
              duplicateErrors.push({
                row: row.rowNumber,
                field: "skuCode",
                message: "SKU 编码已存在",
              });
            if (
              existing.some((item) => item.external_id === row.value.externalId)
            )
              duplicateErrors.push({
                row: row.rowNumber,
                field: "externalId",
                message: "外部商品编号已存在",
              });
          }
        }
        const allErrors = [...errors, ...duplicateErrors];
        const badRows = new Set(allErrors.map((item) => item.row));
        const valid = rows.filter((row) => !badRows.has(row.rowNumber));
        const jobId = randomUUID();
        await sql.begin(async (tx) => {
          await tx`insert into import_jobs (id,merchant_id,idempotency_key,filename,status,total_rows,valid_rows,error_rows,created_at,updated_at) values (${jobId},${merchantId},${key},${file.originalname},'VALIDATED',${totalRows},${valid.length},${badRows.size},now(),now())`;
          for (const row of valid)
            await tx`insert into import_job_rows (job_id,row_number,payload,status,errors,created_at,updated_at) values (${jobId},${row.rowNumber},${tx.json(row.value as never)},'VALID',${tx.json([] as never)},now(),now())`;
          for (const rowNumber of badRows)
            await tx`insert into import_job_rows (job_id,row_number,payload,status,errors,created_at,updated_at) values (${jobId},${rowNumber},${tx.json((rows.find((row) => row.rowNumber === rowNumber)?.value ?? {}) as never)},'INVALID',${tx.json(allErrors.filter((item) => item.row === rowNumber) as never)},now(),now())`;
        });
        return {
          ok: true,
          data: {
            jobId,
            totalRows,
            validRows: valid.length,
            errorRows: badRows.size,
            errors: allErrors.slice(0, 1000),
          },
          requestId: randomUUID(),
        };
      },
    );
  }
  async commit(
    key: string,
    merchantId: string,
    actorId: string,
    jobId: string,
  ) {
    if (!merchantId) throw new BadRequestException("当前账户未绑定商户");
    return this.idem.execute(
      `product-import-commit:${merchantId}`,
      key,
      { jobId },
      async () =>
        this.db().begin(async (tx) => {
          const jobs = await tx<
            Array<{ status: string; valid_rows: number }>
          >`select status,valid_rows from import_jobs where id=${jobId} and merchant_id=${merchantId} for update`;
          const job = jobs[0];
          if (!job) throw new BadRequestException("导入任务不存在");
          if (job.status === "COMPLETED")
            return {
              ok: true,
              data: {
                jobId,
                status: "COMPLETED",
                acceptedRows: job.valid_rows,
              },
              requestId: randomUUID(),
            };
          if (job.status !== "VALIDATED")
            throw new ConflictException("导入任务当前状态不可提交");
          const warehouses = await tx<
            { id: string }[]
          >`select id from warehouses where merchant_id=${merchantId} order by created_at limit 1`;
          if (!warehouses[0]) throw new ConflictException("请先创建仓库");
          const rows = await tx<
            Array<{ payload: ParsedRow }>
          >`select payload from import_job_rows where job_id=${jobId} and status='VALID' order by row_number`;
          await tx`update import_jobs set status='PROCESSING',updated_at=now() where id=${jobId}`;
          for (const { payload } of rows) {
            const productId = randomUUID(),
              skuId = randomUUID();
            const slug = `${
              payload.externalId
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "") || "item"
            }-${productId.slice(0, 8)}`;
            await tx`insert into products (id,merchant_id,source_external_id,slug,title,description,destination,kind,status,created_at,updated_at) values (${productId},${merchantId},${payload.externalId},${slug},${payload.title},${payload.description ?? payload.title},${payload.destination},${payload.kind},'DRAFT',now(),now())`;
            if (payload.imageUrl)
              await tx`insert into product_media (id,product_id,url,alt,sort_order,created_at,updated_at) values (${randomUUID()},${productId},${payload.imageUrl},${payload.title},0,now(),now())`;
            await tx`insert into skus (id,product_id,code,title,price_minor,currency,attributes,commission_bps,active,created_at,updated_at) values (${skuId},${productId},${payload.skuCode},${`${payload.validityDays} 天${payload.dataGb ? ` ${payload.dataGb}GB` : ""}`},${payload.priceMinor},'CNY',${tx.json({ validityDays: payload.validityDays, dataGb: payload.dataGb } as never)},${payload.commissionBps},true,now(),now())`;
            await tx`insert into inventory (sku_id,warehouse_id,available,locked,sold,version,created_at,updated_at) values (${skuId},${warehouses[0].id},${payload.stock},0,0,0,now(),now())`;
          }
          await tx`update import_job_rows set status='IMPORTED',updated_at=now() where job_id=${jobId} and status='VALID'`;
          await tx`update import_jobs set status='COMPLETED',updated_at=now() where id=${jobId}`;
          await tx`insert into audit_logs (actor_id,merchant_id,action,target_type,target_id,request_id,after,created_at) values (${actorId},${merchantId},'catalog.import.commit','IMPORT_JOB',${jobId},${randomUUID()},${tx.json({ acceptedRows: rows.length } as never)},now())`;
          return {
            ok: true,
            data: { jobId, status: "COMPLETED", acceptedRows: rows.length },
            requestId: randomUUID(),
          };
        }),
    );
  }
  private async parse(file: Express.Multer.File) {
    const lower = file.originalname.toLowerCase();
    const isCsv = lower.endsWith(".csv"),
      isXlsx = lower.endsWith(".xlsx");
    if (!isCsv && !isXlsx)
      throw new BadRequestException("仅支持 CSV 或 Excel 文件");
    if (
      isXlsx &&
      !file.buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
    )
      throw new BadRequestException("Excel 文件签名不正确");
    if (isCsv && file.buffer.includes(0))
      throw new BadRequestException("CSV 文件包含非法二进制内容");
    const workbook = new ExcelJS.Workbook();
    if (isCsv) await workbook.csv.read(file.buffer as never);
    else await workbook.xlsx.load(file.buffer as never);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException("文件中没有工作表");
    if (sheet.rowCount > 10_001)
      throw new BadRequestException("单次导入不得超过 10,000 行");
    const headers = (sheet.getRow(1).values as unknown[])
      .slice(1)
      .map((value) => String(value).trim());
    const required = [
      "externalId",
      "title",
      "skuCode",
      "destination",
      "kind",
      "validityDays",
      "priceMinor",
      "stock",
    ];
    const missing = required.filter((header) => !headers.includes(header));
    if (missing.length)
      throw new BadRequestException(`缺少必要列：${missing.join("、")}`);
    if (new Set(headers).size !== headers.length)
      throw new BadRequestException("导入文件包含重复列名");
    const errors: RowError[] = [],
      rows: Array<{ rowNumber: number; value: ParsedRow }> = [],
      seenSku = new Set<string>(),
      seenExternal = new Set<string>();
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const raw = Object.fromEntries(
        headers.map((h, index) => [h, row.getCell(index + 1).value]),
      );
      const parsed = batchImportRowSchema.safeParse({
        externalId: String(raw.externalId ?? ""),
        title: String(raw.title ?? ""),
        description: String(raw.description ?? ""),
        skuCode: String(raw.skuCode ?? ""),
        destination: String(raw.destination ?? ""),
        kind: String(raw.kind ?? ""),
        imageUrl: String(raw.imageUrl ?? "").trim() || undefined,
        dataGb:
          raw.dataGb === "" || raw.dataGb == null ? null : Number(raw.dataGb),
        validityDays: Number(raw.validityDays),
        priceMinor: Number(raw.priceMinor),
        stock: Number(raw.stock),
        commissionBps: Number(raw.commissionBps ?? 0),
      });
      if (!parsed.success) {
        for (const issue of parsed.error.issues)
          errors.push({
            row: rowNumber,
            field: issue.path.join("."),
            message: issue.message,
          });
        return;
      }
      const skuKey = parsed.data.skuCode.toLowerCase(),
        externalKey = parsed.data.externalId.toLowerCase();
      if (seenSku.has(skuKey))
        errors.push({
          row: rowNumber,
          field: "skuCode",
          message: "文件内 SKU 重复",
        });
      if (seenExternal.has(externalKey))
        errors.push({
          row: rowNumber,
          field: "externalId",
          message: "文件内外部商品编号重复",
        });
      seenSku.add(skuKey);
      seenExternal.add(externalKey);
      rows.push({ rowNumber, value: parsed.data });
    });
    return { rows, errors, totalRows: Math.max(0, sheet.rowCount - 1) };
  }
}
