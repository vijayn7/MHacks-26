declare function defineBackground(definition: () => void): void
declare function defineContentScript(definition: {
  matches: string[]
  registration?: 'runtime' | 'manifest'
  main: () => void
}): void
interface ImportMeta {
  readonly env: Record<string, string | undefined>
}
