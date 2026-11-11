import { ApiProperty } from "@nestjs/swagger"
import { IsIn, IsOptional } from "class-validator"
import { PageRequest } from "@modules/platform/openapi"

/** The query of `price.list`: an optional kind, and the page. */
export class ListPricesRequest extends PageRequest {
    /** Only the rows of a NEW sale or only the renewal rows; absent: both. */
    @ApiProperty({ type: String, enum: ["new", "renewal"], required: false })
    @IsOptional()
    @IsIn(["new", "renewal"])
    readonly kind: "new" | "renewal" | null = null
}
