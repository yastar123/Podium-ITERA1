"use client"

import { useState } from "react"
import { QRCodeSVG } from "qrcode.react"

interface TicketQRProps {
  ticket: {
    id: string
    ticketCode: string
    user: {
      name: string
      email: string
      nim: string | null
    }
    event: {
      name: string
      location: string | null
      eventDate: string
    }
  }
  onClose: () => void
}

export default function TicketQR({ ticket, onClose }: TicketQRProps) {
  const [showDetails, setShowDetails] = useState(false)

  // Create QR data with ticket information
  const qrData = JSON.stringify({
    ticketCode: ticket.ticketCode,
    ticketId: ticket.id,
    eventName: ticket.event.name,
    userName: ticket.user.name,
    timestamp: new Date().toISOString()
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">🎫 Tiket Digital</h2>
          <p className="text-gray-600 mb-6">{ticket.event.name}</p>
          
          {/* QR Code */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6 flex justify-center">
            <QRCodeSVG
              value={qrData}
              size={200}
              level="M"
              includeMargin={true}
            />
          </div>
          
          {/* Ticket Code */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-1">Kode Tiket</p>
            <p className="text-2xl font-mono font-bold text-blue-600 bg-blue-50 py-2 px-4 rounded-lg">
              {ticket.ticketCode}
            </p>
          </div>
          
          {/* Toggle Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-blue-600 hover:text-blue-800 text-sm mb-4"
          >
            {showDetails ? "Sembunyikan Detail" : "Tampilkan Detail"}
          </button>
          
          {/* Event Details */}
          {showDetails && (
            <div className="text-left bg-gray-50 p-4 rounded-lg mb-6 space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Nama:</span>
                <span className="ml-2 text-gray-600">{ticket.user.name}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Email:</span>
                <span className="ml-2 text-gray-600">{ticket.user.email}</span>
              </div>
              {ticket.user.nim && (
                <div>
                  <span className="font-medium text-gray-700">NIM:</span>
                  <span className="ml-2 text-gray-600">{ticket.user.nim}</span>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700">Lokasi:</span>
                <span className="ml-2 text-gray-600">{ticket.event.location || "TBA"}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Tanggal:</span>
                <span className="ml-2 text-gray-600">
                  {new Date(ticket.event.eventDate).toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
              </div>
            </div>
          )}
          
          {/* Instructions */}
          <div className="text-sm text-gray-600 mb-6 text-left bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <p className="font-medium text-yellow-800 mb-1">📱 Cara Menggunakan:</p>
            <ul className="text-yellow-700 space-y-1 text-xs">
              <li>• Tunjukkan QR code ini kepada panitia</li>
              <li>• Pastikan smartphone dalam kondisi terang</li>
              <li>• Simpan screenshot sebagai backup</li>
              <li>• Datang 15 menit sebelum acara dimulai</li>
            </ul>
          </div>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}