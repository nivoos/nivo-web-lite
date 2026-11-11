import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./cli.module-definition"
import { MigrateModule } from "./migrate/migrate.module"
import { SeedModule } from "./seed/seed.module"
import { BackupModule } from "./backup/backup.module"
import { CredentialModule } from "./credential/credential.module"
import { ImportModule } from "./import/import.module"

@Module({
    imports: [
        MigrateModule.register({}),
        SeedModule.register({}),
        BackupModule.register({}),
        CredentialModule.register({}),
        ImportModule.register({}),
    ],
})
/** The cli feature root: every command group of the back end, compiled only into apps/cli. */
export class CliModule extends ConfigurableModuleClass {}
