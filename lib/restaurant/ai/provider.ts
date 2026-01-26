export interface LlmProvider {
  generateJson<T>(prompt: string, schemaName: string): Promise<T>
}

export class StubProvider implements LlmProvider {
  async generateJson<T>(_prompt: string, _schemaName: string): Promise<T> {
    throw new Error("Stub provider does not generate content without fixtures.")
  }
}
