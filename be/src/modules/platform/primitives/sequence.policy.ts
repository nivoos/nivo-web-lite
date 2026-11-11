/** One step of a sequence: the work for one item. */
export type SequenceStep<T, R> = (item: T) => Promise<R>

/**
 * Runs `step` over `items` one after the other (each starts when the one before has settled) and answers the results in order.
 * For steps that must not overlap: writes of one transaction, a restore in reference order.
 */
export const eachInOrder = <T, R>(items: ReadonlyArray<T>, step: SequenceStep<T, R>): Promise<Array<R>> =>
    items.reduce<Promise<Array<R>>>(
        (done, item) => done.then(async (results) => [...results, await step(item)]),
        Promise.resolve([]),
    )
