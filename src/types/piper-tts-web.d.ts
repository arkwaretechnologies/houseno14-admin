declare module "piper-tts-web" {
  export class PiperWebEngine {
    constructor(options?: Record<string, unknown>);
    generate(
      text: string,
      voice: string,
      speaker?: number
    ): Promise<{ file: Blob; duration: number; phonemeData: unknown }>;
    destroy(): void;
  }
}
