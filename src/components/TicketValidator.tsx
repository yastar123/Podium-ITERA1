"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// load scanner hanya di client
const QrScanner = dynamic(
  () => import("react-qr-barcode-scanner").then((mod) => mod.default),
  { ssr: false }
);

export default function TicketValidator() {
  const [ticketCode, setTicketCode] = useState("");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [cameraOn, setCameraOn] = useState(false); // kontrol kamera

  // fungsi validasi tiket
  const validateTicket = async (code: string) => {
    if (!code) return;
    try {
      const res = await fetch("/api/tickets/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketCode: code }),
      });

      const result = await res.json();
      setStatus(result.message);
    } catch (err) {
      console.error(err);
      setStatus("❌ Terjadi kesalahan server");
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Validasi Tiket</h1>

      {/* QR Scanner */}
      <div className="border rounded-lg p-2 shadow">
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
          <QrScanner
            onUpdate={(err, result) => {
              if (!!result) {
                const code = result.getText();
                setScanResult(code);
                validateTicket(code);
              }
            }}
            width={500}
            height={300}
          />
        )}

        {scanResult && (
          <p className="mt-2 text-sm text-gray-600">Kode: {scanResult}</p>
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
            placeholder="Masukkan kode tiket"
            className="flex-1 border p-2 rounded"
          />
          <button
            onClick={() => validateTicket(ticketCode)}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Cek
          </button>
        </div>
      </div>

      {/* Status Validasi */}
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
    </div>
  );
}
