import { Column, PrimaryGeneratedColumn, type ValueTransformer } from "typeorm"

/** The columns every crm table carries: the generated uuid key and the two database-set timestamps. Maps no table itself. */
export abstract class UuidAbstractEntity {
    /** The row id. */
    @PrimaryGeneratedColumn("uuid", { name: "id" })
    id!: string

    /** When the row was created; the database sets it. */
    @Column({ name: "created_at", type: "timestamptz", insert: false, update: false })
    createdAt!: Date

    /** When the row last changed; the crm.set_updated_at trigger sets it. */
    @Column({ name: "updated_at", type: "timestamptz", insert: false, update: false })
    updatedAt!: Date
}

/** Reads a bigint column (text from the driver) as a number of whole VND and writes it back unchanged, keeping null. */
export const bigintNumberTransformer: ValueTransformer = {
    to: (value: number | null | undefined): number | null | undefined => value,
    from: (value: string | null): number | null => (value === null ? null : Number(value)),
}
