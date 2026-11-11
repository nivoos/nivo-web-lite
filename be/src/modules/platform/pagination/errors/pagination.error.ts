import { DomainError, type ErrorKind } from "@modules/platform/errors"

/** Codes of keyset paging. */
export enum PaginationErrorCode {
    /** The cursor is not one this list issued (malformed, another list's, or another key width). */
    CursorInvalid = "PAGINATION_CURSOR_INVALID",
}

/** How each paging code travels. */
export const PAGINATION_ERROR_KINDS: Record<PaginationErrorCode, ErrorKind> = {
    [PaginationErrorCode.CursorInvalid]: "invalid",
}

/** The one error class of paging. */
export class PaginationError extends DomainError<PaginationErrorCode> {}
