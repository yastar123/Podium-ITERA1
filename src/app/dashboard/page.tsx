"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import TicketQR from "@/components/ticket-qr"

interface Event {
  id: string
  name: string
  description: string | null
  location: string | null
  eventDate: string
  quota: number
  isActive: boolean
}

interface Ticket {
  id: string
  ticketCode: string
  status: string
  issuedAt: string
  event: Event
  user: {
    name: string | null
    email: string
    nim: string
  }
}

export default function StudentDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [userTickets, setUserTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)

  useEffect(() => {
    if (status === "loading") return
    
    if (!session || session.user.role !== "STUDENT") {
      router.push("/auth/signin")
      return
    }

    fetchData()
  }, [session, status, router])

  const fetchData = async () => {
    try {
      // Fetch available events and user tickets
      const [eventsRes, ticketsRes] = await Promise.all([
        fetch("/api/events"),
        fetch("/api/tickets/my-tickets")
      ])

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json()
        setEvents(eventsData)
      }

      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json()
        setUserTickets(ticketsData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const claimTicket = async (eventId: string) => {
    try {
      const response = await fetch("/api/tickets/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ eventId }),
      })

      const data = await response.json()

      if (response.ok) {
        alert("Tiket berhasil diklaim! 🎉")
        fetchData() // Refresh data
      } else {
        alert(data.error || "Gagal mengklaim tiket")
      }
    } catch (error) {
      console.error("Error claiming ticket:", error)
      alert("Terjadi kesalahan saat mengklaim tiket")
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">🎫 Dashboard Mahasiswa</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Halo, {session?.user?.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* My Tickets Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">🎟️ Tiket Saya</h2>
          {userTickets.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="text-6xl mb-4">🎫</div>
              <p className="text-gray-600 text-lg">Anda belum memiliki tiket</p>
              <p className="text-gray-500">Klaim tiket di bagian "Acara Tersedia" di bawah</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userTickets.map((ticket) => (
                <div key={ticket.id} className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg text-gray-800">{ticket.event.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      ticket.status === "ACTIVE" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {ticket.status === "ACTIVE" ? "Aktif" : ticket.status}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><strong>Kode Tiket:</strong> {ticket.ticketCode}</p>
                    <p><strong>Lokasi:</strong> {ticket.event.location}</p>
                    <p><strong>Tanggal:</strong> {new Date(ticket.event.eventDate).toLocaleDateString("id-ID")}</p>
                    <p><strong>Diklaim:</strong> {new Date(ticket.issuedAt).toLocaleDateString("id-ID")}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedTicket(ticket)}
                    className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Lihat QR Code
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Events Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📅 Acara Tersedia</h2>
          {events.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="text-6xl mb-4">📅</div>
              <p className="text-gray-600 text-lg">Tidak ada acara yang tersedia saat ini</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => {
                const hasTicket = userTickets.some(ticket => ticket.event.id === event.id)
                
                return (
                  <div key={event.id} className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold text-lg text-gray-800 mb-3">{event.name}</h3>
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p><strong>Deskripsi:</strong> {event.description || "Tidak ada deskripsi"}</p>
                      <p><strong>Lokasi:</strong> {event.location || "TBA"}</p>
                      <p><strong>Tanggal:</strong> {new Date(event.eventDate).toLocaleDateString("id-ID")}</p>
                      <p><strong>Kuota:</strong> {event.quota} tiket</p>
                    </div>
                    
                    {hasTicket ? (
                      <button 
                        disabled 
                        className="w-full bg-gray-300 text-gray-500 py-2 rounded-lg cursor-not-allowed"
                      >
                        Sudah Memiliki Tiket
                      </button>
                    ) : (
                      <button
                        onClick={() => claimTicket(event.id)}
                        className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Klaim Tiket
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* QR Code Modal */}
      {selectedTicket && (
        <TicketQR
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  )
}