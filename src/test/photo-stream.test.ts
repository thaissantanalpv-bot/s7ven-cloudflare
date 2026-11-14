import { afterEach, describe, expect, it, vi } from "vitest";
import { streamImage } from "@/lib/photos/stream-image";

afterEach(() => vi.unstubAllGlobals());

describe("photo editing stream", () => {
  it("never repeats a paid edit when the stream is empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { headers: { "Content-Type": "text/event-stream" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(streamImage("/api/edit-photo", new FormData(), vi.fn())).rejects.toThrow("não retornou uma foto");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("allows applying only a completed streamed photo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      'event: image_edit.partial_image\ndata: {"b64_json":"preview"}\n\nevent: image_edit.completed\ndata: {"b64_json":"final"}\n\n',
      { headers: { "Content-Type": "text/event-stream" } },
    ));
    vi.stubGlobal("fetch", fetchMock);
    const frame = vi.fn();
    await streamImage("/api/edit-photo", new FormData(), frame);
    expect(frame.mock.calls).toEqual([["data:image/png;base64,preview", false], ["data:image/png;base64,final", true]]);
  });
});