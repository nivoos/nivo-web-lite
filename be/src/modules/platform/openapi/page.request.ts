import { ApiProperty } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator"

/** The paging query of every list GET: `limit` 1..50 (default 20) and the opaque `cursor` of the previous page. */
export class PageRequest {
    /** Page size, 1..50; default 20. */
    @ApiProperty({ type: "integer", minimum: 1, maximum: 50, required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    readonly limit?: number

    /** The previous page's `nextCursor`; absent for the first page. */
    @ApiProperty({ type: String, maxLength: 2048, required: false })
    @IsOptional()
    @IsString()
    @MaxLength(2048)
    readonly cursor?: string
}
