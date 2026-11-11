import { Injectable } from "@nestjs/common"

@Injectable()
/**
 * The operator terminal of a cli command: the one place a secret is shown, once, on standard output. Nothing written here goes
 * through the Logger, so a secret never reaches a log line.
 */
export class OperatorOutputClient {
    /** Shows one line to the operator. */
    show(line: string): void {
        process.stdout.write(`${line}\n`)
    }
}
