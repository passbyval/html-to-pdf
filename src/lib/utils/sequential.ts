export async function sequential<T>(
  tasks: Array<(() => Promise<T>) | Promise<T>>
): Promise<T[]> {
  const results: T[] = []

  for (const task of tasks) {
    const result = typeof task === 'function' ? await task() : await task
    results.push(result)
  }

  return results
}
