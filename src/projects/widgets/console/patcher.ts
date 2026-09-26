export type PatchFormat = "ips" | "ups" | "bps";

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array, start = 0, end = data.length): number {
  let crc = 0xffffffff;
  for (let i = start; i < end; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export async function sha1Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", data as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hasCopierHeader(rom: Uint8Array): boolean {
  return rom.length % 1024 === 512;
}

export function stripCopierHeader(rom: Uint8Array): Uint8Array {
  return hasCopierHeader(rom) ? rom.slice(512) : rom;
}

export function detectPatchFormat(patch: Uint8Array): PatchFormat | null {
  const magic = String.fromCharCode(...patch.slice(0, 5));
  if (magic === "PATCH") return "ips";
  if (magic.startsWith("UPS1")) return "ups";
  if (magic.startsWith("BPS1")) return "bps";
  return null;
}

export class PatchError extends Error {}

function readU32LE(data: Uint8Array, offset: number): number {
  return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0;
}

/** Variable-length integer used by both UPS and BPS. */
function makeVarintReader(data: Uint8Array, startAt: number) {
  let ptr = startAt;
  return {
    get ptr() {
      return ptr;
    },
    set ptr(v: number) {
      ptr = v;
    },
    byte(): number {
      if (ptr >= data.length) throw new PatchError("Patch terminou antes do esperado.");
      return data[ptr++];
    },
    varint(): number {
      let value = 0;
      let shift = 1;
      for (;;) {
        if (ptr >= data.length) throw new PatchError("Patch terminou antes do esperado.");
        const x = data[ptr++];
        value += (x & 0x7f) * shift;
        if (x & 0x80) break;
        shift *= 128;
        value += shift;
      }
      return value;
    },
  };
}

export function applyIps(rom: Uint8Array, patch: Uint8Array): Uint8Array {
  if (detectPatchFormat(patch) !== "ips") throw new PatchError("Arquivo IPS inválido.");
  let out = new Uint8Array(rom);
  let ptr = 5;
  const ensure = (size: number) => {
    if (size > out.length) {
      if (size > 32 * 1024 * 1024) throw new PatchError("O patch IPS gera um arquivo grande demais.");
      const grown = new Uint8Array(size);
      grown.set(out);
      out = grown;
    }
  };

  for (;;) {
    if (ptr + 3 > patch.length) throw new PatchError("Patch IPS incompleto (sem marcador EOF).");
    if (patch[ptr] === 0x45 && patch[ptr + 1] === 0x4f && patch[ptr + 2] === 0x46) {
      ptr += 3;
      break;
    }
    if (ptr + 5 > patch.length) throw new PatchError("Patch IPS corrompido.");
    const offset = (patch[ptr] << 16) | (patch[ptr + 1] << 8) | patch[ptr + 2];
    const size = (patch[ptr + 3] << 8) | patch[ptr + 4];
    ptr += 5;
    if (size === 0) {
      if (ptr + 3 > patch.length) throw new PatchError("Patch IPS corrompido (RLE).");
      const rleSize = (patch[ptr] << 8) | patch[ptr + 1];
      const value = patch[ptr + 2];
      ptr += 3;
      ensure(offset + rleSize);
      out.fill(value, offset, offset + rleSize);
    } else {
      if (ptr + size > patch.length) throw new PatchError("Patch IPS corrompido (dados).");
      ensure(offset + size);
      out.set(patch.subarray(ptr, ptr + size), offset);
      ptr += size;
    }
  }

  if (ptr + 3 <= patch.length) {
    const truncate = (patch[ptr] << 16) | (patch[ptr + 1] << 8) | patch[ptr + 2];
    if (truncate > 0 && truncate < out.length) out = out.slice(0, truncate);
  }
  return out;
}

export interface ChecksummedPatchInfo {
  sourceCrc: number;
  targetCrc: number;
}

export function readChecksummedPatchInfo(patch: Uint8Array): ChecksummedPatchInfo {
  if (patch.length < 16) throw new PatchError("Patch pequeno demais.");
  const end = patch.length;
  const patchCrc = readU32LE(patch, end - 4);
  if (crc32(patch, 0, end - 4) !== patchCrc) {
    throw new PatchError("O arquivo de patch está corrompido (checksum do patch não confere).");
  }
  return { sourceCrc: readU32LE(patch, end - 12), targetCrc: readU32LE(patch, end - 8) };
}

export function applyUps(rom: Uint8Array, patch: Uint8Array): Uint8Array {
  if (detectPatchFormat(patch) !== "ups") throw new PatchError("Arquivo UPS inválido.");
  const info = readChecksummedPatchInfo(patch);
  if (crc32(rom) !== info.sourceCrc) {
    throw new PatchError("Este patch UPS não é compatível com este arquivo de jogo (CRC32 diferente).");
  }
  const r = makeVarintReader(patch, 4);
  const inputSize = r.varint();
  const outputSize = r.varint();
  if (inputSize !== rom.length) throw new PatchError("Tamanho do jogo diferente do esperado pelo patch UPS.");

  const out = new Uint8Array(outputSize);
  out.set(rom.subarray(0, Math.min(rom.length, outputSize)));
  let pos = 0;
  const footer = patch.length - 12;
  while (r.ptr < footer) {
    pos += r.varint();
    for (;;) {
      const x = r.byte();
      if (x === 0) {
        pos++;
        break;
      }
      if (pos < outputSize) out[pos] ^= x;
      pos++;
    }
  }
  if (crc32(out) !== info.targetCrc) throw new PatchError("O resultado do patch UPS não confere com o esperado.");
  return out;
}

export function applyBps(rom: Uint8Array, patch: Uint8Array): Uint8Array {
  if (detectPatchFormat(patch) !== "bps") throw new PatchError("Arquivo BPS inválido.");
  const info = readChecksummedPatchInfo(patch);
  if (crc32(rom) !== info.sourceCrc) {
    throw new PatchError("Este patch BPS não é compatível com este arquivo de jogo (CRC32 diferente).");
  }
  const r = makeVarintReader(patch, 4);
  const sourceSize = r.varint();
  const targetSize = r.varint();
  const metadataSize = r.varint();
  r.ptr = r.ptr + metadataSize;
  if (sourceSize !== rom.length) throw new PatchError("Tamanho do jogo diferente do esperado pelo patch BPS.");

  const out = new Uint8Array(targetSize);
  let outOff = 0;
  let sourceRel = 0;
  let targetRel = 0;
  const footer = patch.length - 12;
  while (r.ptr < footer) {
    const data = r.varint();
    const command = data & 3;
    let length = Math.floor(data / 4) + 1;
    if (outOff + length > targetSize) throw new PatchError("Patch BPS corrompido (escreve fora do arquivo).");
    switch (command) {
      case 0:
        while (length--) {
          out[outOff] = rom[outOff] ?? 0;
          outOff++;
        }
        break;
      case 1:
        while (length--) out[outOff++] = r.byte();
        break;
      case 2: {
        const d = r.varint();
        sourceRel += (d & 1 ? -1 : 1) * Math.floor(d / 2);
        while (length--) out[outOff++] = rom[sourceRel++] ?? 0;
        break;
      }
      default: {
        const d = r.varint();
        targetRel += (d & 1 ? -1 : 1) * Math.floor(d / 2);
        while (length--) out[outOff++] = out[targetRel++];
        break;
      }
    }
  }
  if (crc32(out) !== info.targetCrc) throw new PatchError("O resultado do patch BPS não confere com o esperado.");
  return out;
}

export interface SnesHeaderInfo {
  title: string;
  mapping: "lorom" | "hirom";
  checksumValid: boolean;
}

function readSnesHeaderAt(rom: Uint8Array, base: number, mapping: "lorom" | "hirom"): SnesHeaderInfo | null {
  if (rom.length < base + 0x40) return null;
  const complement = rom[base + 0x1c] | (rom[base + 0x1d] << 8);
  const checksum = rom[base + 0x1e] | (rom[base + 0x1f] << 8);
  let title = "";
  for (let i = 0; i < 21; i++) {
    const c = rom[base + i];
    title += c >= 0x20 && c < 0x7f ? String.fromCharCode(c) : " ";
  }
  return { title: title.replace(/\s+/g, " ").trim(), mapping, checksumValid: (checksum ^ complement) === 0xffff };
}

/** Reads the internal SNES header (ignores the optional 512-byte copier header). */
export function readSnesHeader(rom: Uint8Array): SnesHeaderInfo | null {
  const body = stripCopierHeader(rom);
  const lo = readSnesHeaderAt(body, 0x7fc0, "lorom");
  const hi = readSnesHeaderAt(body, 0xffc0, "hirom");
  if (lo?.checksumValid) return lo;
  if (hi?.checksumValid) return hi;
  return lo ?? hi;
}

export interface PatchResult {
  output: Uint8Array;
  format: PatchFormat;
  /** Whether the copier header had to be removed/added to match the patch. */
  adjustedHeader: boolean;
  warnings: string[];
}

/**
 * Applies a patch without touching the original buffer. For UPS/BPS the source CRC32 must
 * match (tries with and without the 512-byte copier header). For IPS, which has no checksum,
 * the variant that keeps a valid SNES internal header wins.
 */
export function applyPatch(rom: Uint8Array, patch: Uint8Array): PatchResult {
  const format = detectPatchFormat(patch);
  if (!format) throw new PatchError("Formato de patch não reconhecido. Use arquivos .ips, .bps ou .ups.");

  const withoutHeader = stripCopierHeader(rom);
  const headerDiffers = withoutHeader.length !== rom.length;

  if (format === "ups" || format === "bps") {
    const apply = format === "ups" ? applyUps : applyBps;
    const info = readChecksummedPatchInfo(patch);
    if (crc32(rom) === info.sourceCrc) return { output: apply(rom, patch), format, adjustedHeader: false, warnings: [] };
    if (headerDiffers && crc32(withoutHeader) === info.sourceCrc) {
      return { output: apply(withoutHeader, patch), format, adjustedHeader: true, warnings: [] };
    }
    throw new PatchError(
      "Este patch não é compatível com o seu arquivo de jogo (a versão do jogo é diferente da esperada pelo patch)."
    );
  }

  const candidates: { input: Uint8Array; adjusted: boolean }[] = [{ input: rom, adjusted: false }];
  if (headerDiffers) candidates.push({ input: withoutHeader, adjusted: true });
  else {
    const withHeader = new Uint8Array(rom.length + 512);
    withHeader.set(rom, 512);
    candidates.push({ input: withHeader, adjusted: true });
  }

  const results = candidates.map((c) => {
    const output = applyIps(c.input, patch);
    const header = readSnesHeader(output);
    return { ...c, output, valid: !!header?.checksumValid, title: header?.title ?? "" };
  });
  const best = results.find((r) => r.valid && !r.adjusted) ?? results.find((r) => r.valid);
  if (best) {
    const output = best.adjusted ? stripCopierHeader(best.output) : best.output;
    return { output, format, adjustedHeader: best.adjusted, warnings: [] };
  }
  return {
    output: results[0].output,
    format,
    adjustedHeader: false,
    warnings: [
      "Patches IPS não trazem verificação de versão e o cabeçalho do jogo não pôde ser confirmado. Se o jogo não abrir, use um patch feito para a sua versão.",
    ],
  };
}
