declare function defineBackground(definition: () => void): void
declare function defineContentScript(definition: {
  matches: string[]
  registration?: 'runtime' | 'manifest'
  main: () => void
}): void
