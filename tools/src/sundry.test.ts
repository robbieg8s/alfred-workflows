import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import {
  arrayBufferToString,
  encatchulate,
  getEnvOrThrow,
  partition,
  shQuote,
  splitArrayBufferOn,
  ProcessBuilder,
} from "./sundry.ts";

const bytesToArrayBuffer = (bytes: number[]) => {
  const arrayBuffer = new ArrayBuffer(bytes.length);
  const dataView = new DataView(arrayBuffer);
  bytes.forEach((byte, index) => dataView.setUint8(index, byte));
  return arrayBuffer;
};

describe("arrayBufferToString", () => {
  it("decodes 'Hello world'", () => {
    const arrayBuffer = bytesToArrayBuffer([
      0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64,
    ]);
    assert.equal(arrayBufferToString(arrayBuffer), "Hello world");
  });

  it("throws if decoding fails", () => {
    // 0xFF is not legal in UTF-8
    const arrayBuffer = bytesToArrayBuffer([0xff]);
    assert.throws(() => arrayBufferToString(arrayBuffer));
  });

  it("does not elide the BOM", () => {
    // This test checks that we aren't suppressing the BOM
    // 0xEF 0xBB 0xBF is the UTF8 encoding of the 0xFEFF BOM
    const arrayBuffer = bytesToArrayBuffer([0xef, 0xbb, 0xbf]);
    const decodedBom = arrayBufferToString(arrayBuffer);
    assert.equal(decodedBom.length, 1);
    assert.equal(decodedBom.charCodeAt(0), 0xfeff);
  });
});

describe("encatchulate", () => {
  it("converts throw to reject", () => {
    assert.rejects(
      async () =>
        await encatchulate(() => {
          throw new Error();
        }),
    );
  });
});

describe("getEnvOrThrow", () => {
  it("gets defined variables", () => {
    // POSIX says the system "shall initialize this variable"
    assert.equal(getEnvOrThrow("HOME"), process.env["HOME"]);
  });
  it("throws for missing variables", () => {
    assert.throws(() => getEnvOrThrow(crypto.randomUUID()));
  });
});

describe("partition", () => {
  const isEven = (n: number) => 0 === n % 2;
  it("partitions", () => {
    // I want to ensure this syntax works
    const [even, odd] = partition([1, 2, 3], isEven);
    assert.deepEqual(even, [2]);
    assert.deepEqual(odd, [1, 3]);
  });
});

describe("shQuote", () => {
  it("quotes", () => {
    assert.equal(shQuote(`a'b"c`), `'a'"'"'b"c'`);
  });
});

describe("splitArrayBufferOn", () => {
  it("can split on null", () => {
    const arrayBuffer = bytesToArrayBuffer([
      0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0x00,
    ]);
    assert.deepEqual(splitArrayBufferOn(arrayBuffer, 0), ["Hello", "world"]);
  });

  it("can split on newline", () => {
    const arrayBuffer = bytesToArrayBuffer([
      0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x0a, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0x0a,
    ]);
    assert.deepEqual(splitArrayBufferOn(arrayBuffer, 10), ["Hello", "world"]);
  });

  it("splits empty to empty", () => {
    const arrayBuffer = new ArrayBuffer(0);
    assert.deepEqual(splitArrayBufferOn(arrayBuffer, 0), []);
  });

  it("throws if a terminator is not provided", () => {
    const arrayBuffer = bytesToArrayBuffer([0x48]);
    assert.throws(() => splitArrayBufferOn(arrayBuffer, 10));
  });
});

describe("ProcessBuilder", () => {
  it("can run", async () => {
    const stdout = arrayBufferToString(
      await new ProcessBuilder("/bin/pwd").run(),
    );
    assert.equal(stdout, process.cwd() + "\n");
  });
  it("can pass args", async () => {
    const uuid = crypto.randomUUID();
    const stdout = arrayBufferToString(
      await new ProcessBuilder("/bin/sh", "-c", `printf '%s' ${uuid}`).run(),
    );
    assert.equal(stdout, uuid);
  });
  it("can cwd and run", async () => {
    const stdout = arrayBufferToString(
      await new ProcessBuilder("/bin/pwd").withCwd("test").run(),
    );
    assert.equal(stdout, path.join(process.cwd(), "test") + "\n");
  });
  it("throws for nonzero exit", async () => {
    const runWillThrow = new ProcessBuilder("/bin/false");
    assert.rejects(async () => await runWillThrow.run());
  });
});
