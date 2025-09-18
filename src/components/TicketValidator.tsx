"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// load scanner hanya di client
const QrScanner = dynamic(
  () => import("react-qr-barcode-scanner").then((mod) => mod.default),
  { ssr: false }
);

// Interface untuk popup
interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: "success" | "error" | "warning";
}

// Komponen Popup
const Popup = ({ isOpen, onClose, title, message, type }: PopupProps) => {
  if (!isOpen) return null;

  const bgColor =
    type === "success"
      ? "bg-green-50 border-green-200"
      : type === "warning"
      ? "bg-yellow-50 border-yellow-200"
      : "bg-red-50 border-red-200";

  const textColor =
    type === "success"
      ? "text-green-800"
      : type === "warning"
      ? "text-yellow-800"
      : "text-red-800";

  const icon = type === "success" ? "✅" : type === "warning" ? "⚠️" : "❌";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className={`${bgColor} border rounded-lg p-4 mb-4`}>
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-2">{icon}</span>
            <h3 className={`font-bold text-lg ${textColor}`}>{title}</h3>
          </div>
          <p className={`${textColor}`}>{message}</p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};

export default function TicketValidator() {
  const [ticketCode, setTicketCode] = useState("");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [cameraOn, setCameraOn] = useState(false);

  // State untuk popup
  const [popup, setPopup] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "success",
  });

  // Fungsi untuk menampilkan popup
  const showPopup = (
    title: string,
    message: string,
    type: "success" | "error" | "warning"
  ) => {
    setPopup({
      isOpen: true,
      title,
      message,
      type,
    });
  };

  // Fungsi untuk menutup popup
  const closePopup = () => {
    setPopup((prev) => ({ ...prev, isOpen: false }));
  };

  // Fungsi untuk mengekstrak kode tiket dari berbagai format
  const extractTicketCode = (data: string): string => {
    try {
      // Coba parse sebagai JSON (dari QR code)
      const parsed = JSON.parse(data);
      if (parsed.ticketCode) {
        return parsed.ticketCode;
      }
    } catch (error) {
      // Jika bukan JSON, anggap sebagai kode tiket langsung
      return data.trim();
    }

    // Fallback: return data as is
    return data.trim();
  };

  // fungsi validasi tiket
  const validateTicket = async (code: string) => {
    if (!code) {
      showPopup("Error", "Kode tiket tidak boleh kosong", "error");
      return;
    }

    // Ekstrak kode tiket dari input
    const ticketCode = extractTicketCode(code);

    try {
      const res = await fetch("/api/tickets/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketCode: ticketCode }),
      });

      const result = await res.json();

      // Set status untuk display
      setStatus(result.message);

      // Tentukan tipe popup berdasarkan hasil validasi
      let popupType: "success" | "error" | "warning" = "error";
      let popupTitle = "Validasi Tiket";

      if (result.message.includes("✅")) {
        popupType = "success";
        popupTitle = "Tiket Valid!";
      } else if (result.message.includes("⚠️")) {
        popupType = "warning";
        popupTitle = "Perhatian!";
      } else {
        popupType = "error";
        popupTitle = "Tiket Tidak Valid!";
      }

      // Tampilkan popup
      showPopup(popupTitle, result.message, popupType);
    } catch (err) {
      console.error(err);
      const errorMessage = "Terjadi kesalahan server. Silakan coba lagi.";
      setStatus(`❌ ${errorMessage}`);
      showPopup("Error Server", errorMessage, "error");
    }
  };

  // Handler untuk hasil scan QR
  const handleScanResult = (result: any) => {
    const scannedData = result.getText();
    setScanResult(scannedData);

    // Debug: tampilkan data yang di-scan
    console.log("Data yang di-scan:", scannedData);

    // Ekstrak kode tiket dan validasi
    const ticketCode = extractTicketCode(scannedData);
    console.log("Kode tiket yang diekstrak:", ticketCode);

    validateTicket(scannedData);

    // Matikan kamera setelah scan berhasil
    setCameraOn(false);
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Validasi Tiket</h1>

      {/* QR Scanner */}
      <div className="border rounded-lg p-4 shadow">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Scan QR</h2>
          <button
            onClick={() => setCameraOn((prev) => !prev)}
            className={`px-3 py-1 rounded text-white ${
              cameraOn ? "bg-red-600" : "bg-green-600"
            }`}
          >
            {cameraOn ? "Matikan Kamera" : "Nyalakan Kamera"}
          </button>
        </div>

        {cameraOn && (
          <div className="flex justify-center">
            <QrScanner
              onUpdate={(err, result) => {
                if (!!result) {
                  handleScanResult(result);
                }
              }}
              width={500}
              height={300}
            />
          </div>
        )}

        {scanResult && (
          <div className="mt-2 p-2 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">
              <strong>Data Scan:</strong> {scanResult}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Kode Tiket:</strong> {extractTicketCode(scanResult)}
            </p>
          </div>
        )}
      </div>

      {/* Input Manual */}
      <div className="border rounded-lg p-4 shadow">
        <h2 className="font-semibold mb-2">Input Manual</h2>
        <div className="flex space-x-2">
          <input
            type="text"
            value={ticketCode}
            onChange={(e) => setTicketCode(e.target.value)}
            placeholder="Masukkan kode tiket (contoh: 12345678)"
            className="flex-1 border p-2 rounded"
          />
          <button
            onClick={() => validateTicket(ticketCode)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Cek
          </button>
        </div>
      </div>

      {/* Status Validasi - tetap tampilkan untuk debugging */}
      {status && (
        <div
          className={`mt-4 p-3 rounded-lg border font-bold text-center ${
            status.includes("✅")
              ? "bg-green-100 text-green-700"
              : status.includes("⚠️")
              ? "bg-yellow-100 text-yellow-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {status}
        </div>
      )}

      {/* Debug Info */}
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        <p>
          <strong>Debug:</strong>
        </p>
        <p>Manual Input: {ticketCode}</p>
        <p>Scan Result: {scanResult}</p>
        {scanResult && <p>Extracted Code: {extractTicketCode(scanResult)}</p>}
      </div>

      {/* Popup */}
      <Popup
        isOpen={popup.isOpen}
        onClose={closePopup}
        title={popup.title}
        message={popup.message}
        type={popup.type}
      />
    </div>
  );
}
