import { mock } from "@starci/jest-preset"
import { Test } from "@nestjs/testing"
import { SeedRunnerService } from "@modules/platform/database"
import { RunSeedsCli } from "./run.cli"

const build = async () => {
    const seeds = mock<SeedRunnerService>()
    const moduleRef = await Test.createTestingModule({
        providers: [RunSeedsCli, { provide: SeedRunnerService, useValue: seeds }],
    }).compile()
    return { command: moduleRef.get(RunSeedsCli), seeds }
}

describe("RunSeedsCli", () => {
    it("delegates the seed run of the named environment to the seed runner once", async () => {
        const { command, seeds } = await build()

        await expect(command.run([], { env: "production" })).resolves.toBeUndefined()

        expect(seeds.run).toHaveBeenCalledWith("production")
        expect(seeds.run).toHaveBeenCalledTimes(1)
    })

    it("delegates with no environment when none is named, and takes --env as given", async () => {
        const { command, seeds } = await build()

        await command.run([])

        expect(seeds.run).toHaveBeenCalledWith(undefined)
        expect(command.parseEnv("production")).toBe("production")
    })
})
