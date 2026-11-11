import { ApiProperty } from "@nestjs/swagger"

/** The error body every CRM operation answers as `default` (the same `ErrorResponse` schema the scaffold's doors declare). */
export class ErrorResponse {
    /** The machine code of the failure, stable across releases. */
    @ApiProperty() readonly code!: string
    /** The failure in words, from the messages catalog. */
    @ApiProperty() readonly message!: string
}
