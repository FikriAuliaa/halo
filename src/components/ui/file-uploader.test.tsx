import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileUploader } from "./file-uploader";

function makeFile(name = "bukti.png", type = "image/png") {
  return new File(["x"], name, { type });
}

describe("FileUploader", () => {
  it("idle state: shows the label, hint, and a keyboard-reachable file input", () => {
    render(<FileUploader state="idle" onFileSelected={vi.fn()} />);
    expect(screen.getByText("Unggah Bukti Pembayaran")).toBeInTheDocument();
    expect(screen.getByText("Format JPG, PNG, WEBP (Maks 5MB)")).toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument();
  });

  it("calls onFileSelected when a file is chosen via the input", async () => {
    const onFileSelected = vi.fn();
    render(<FileUploader state="idle" onFileSelected={onFileSelected} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile();
    await userEvent.upload(input, file);
    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("calls onFileSelected on drag-and-drop", () => {
    const onFileSelected = vi.fn();
    render(<FileUploader state="idle" onFileSelected={onFileSelected} />);
    const dropzone = screen.getByText("Unggah Bukti Pembayaran").closest("div")!;
    const file = makeFile();
    const dataTransfer = { files: [file] } as unknown as DataTransfer;
    dropzone.dispatchEvent(
      Object.assign(new Event("drop", { bubbles: true, cancelable: true }), { dataTransfer }),
    );
    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("selected state: shows the file name and a remove action", async () => {
    const onRemove = vi.fn();
    render(
      <FileUploader
        state="selected"
        file={makeFile("proof.jpg", "image/jpeg")}
        onFileSelected={vi.fn()}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByText("proof.jpg")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Hapus"));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("uploading state: shows a determinate progress bar and a cancel action", async () => {
    const onCancel = vi.fn();
    render(
      <FileUploader
        state="uploading"
        progressPercent={42}
        onFileSelected={vi.fn()}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "42");
    await userEvent.click(screen.getByText("Batalkan"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("error state: shows the message via role=alert and a retry action", async () => {
    const onRetry = vi.fn();
    render(
      <FileUploader
        state="error"
        errorMessage="File terlalu besar."
        onFileSelected={vi.fn()}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("File terlalu besar.");
    await userEvent.click(screen.getByText("Coba Lagi"));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("success state: shows the file name and a replace action", async () => {
    const onRemove = vi.fn();
    render(
      <FileUploader
        state="success"
        file={makeFile("proof.jpg")}
        onFileSelected={vi.fn()}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByText("proof.jpg")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Ganti"));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("revokes the preview object URL on unmount to avoid a memory leak", () => {
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    const { unmount } = render(
      <FileUploader state="selected" file={makeFile()} onFileSelected={vi.fn()} />,
    );
    unmount();
    expect(revokeSpy).toHaveBeenCalled();
    revokeSpy.mockRestore();
  });
});
