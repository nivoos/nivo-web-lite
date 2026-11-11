import { ApiProperty } from "@nestjs/swagger"
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator"
import { PageRequest } from "@modules/platform/openapi"

/** The customer search: text and page. */
export class FindCustomerRequest extends PageRequest {
    /** Text matched against code, name, tax id, phone, e-mail and website domain (case-insensitive). */
    @ApiProperty({ type: String, maxLength: 100, minLength: 1 })
    @IsString()
    @MaxLength(100)
    @MinLength(1)
    readonly q!: string
}

/** Links a Zalo id, an e-mail or a phone to the customer. */
export class LinkContactRequest {
    /** The channel of the address. */
    @ApiProperty({ type: String, enum: ["zalo", "email", "phone"] })
    @IsIn(["zalo", "email", "phone"])
    readonly channel!: "zalo" | "email" | "phone"

    /** The Zalo id, e-mail or phone. */
    @ApiProperty({ type: String, maxLength: 200, minLength: 1 })
    @IsString()
    @MaxLength(200)
    @MinLength(1)
    readonly address!: string

    /** The person's name; the customer's name when absent. */
    @ApiProperty({ type: String, maxLength: 200, minLength: 1, required: false })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    @MinLength(1)
    readonly name: string | null = null
}

/** The path of a customer door. */
export class CustomerPathRequest {
    /** The customer code as the books write it. */
    @ApiProperty({ type: String, maxLength: 80, minLength: 1 })
    @IsString()
    @MaxLength(80)
    @MinLength(1)
    readonly code!: string
}
