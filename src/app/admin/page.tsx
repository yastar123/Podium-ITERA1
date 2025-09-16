"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { signOut } from "next-auth/react"

interface User {
  id: string
  email: string
  name: string
  nim: string | null
  role: string
}

interface Event {
  id: string
  name: string
  description: string | null
  location: string | null
  eventDate: string
  quota: number
  isActive: boolean
  _count: {
    tickets: number
  }
}

interface Ticket {
  id: string
  ticketCode: string
  status: string
  issuedAt: string
  user: User
  event: Event
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [allTickets, setAllTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "loading") return
    
    if (!session || session.user.role !== "ADMIN") {
      router.push("/auth/signin")
      return
    }

    fetchData()
  }, [session, status, router])

  const fetchData = async () => {
    try {
      // Fetch admin events with ticket counts
      const eventsRes = await fetch("/api/events/admin")
      
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json()
        setEvents(eventsData)
      }

      // Mock tickets data for now
      setAllTickets([])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">🛡️ Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Admin: {session?.user?.name}</span>
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
        {/* Statistics Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">📅</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Total Events</h3>
                <p className="text-3xl font-bold text-blue-600">{events.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">🎫</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Total Tickets</h3>
                <p className="text-3xl font-bold text-green-600">{allTickets.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">👥</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Participants</h3>
                <p className="text-3xl font-bold text-purple-600">{allTickets.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Events Management */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">📅 Manajemen Events</h2>
            <button className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors">
              + Tambah Event Baru
            </button>
          </div>
          
          {events.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="text-6xl mb-4">📅</div>
              <p className="text-gray-600 text-lg">Tidak ada event yang tersedia</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tanggal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lokasi
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kuota
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {events.map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{event.name}</div>
                            <div className="text-sm text-gray-500">{event.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(event.eventDate).toLocaleDateString("id-ID")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event.location || "TBA"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event._count?.tickets || 0} / {event.quota}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            event.isActive 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }`}>
                            {event.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900 mr-3">
                            Edit
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">⚡ Quick Actions</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-center">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="font-semibold text-gray-800">Export Data</h3>
              <p className="text-sm text-gray-600">Download participant data</p>
            </button>
            
            <button className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-center">
              <div className="text-3xl mb-2">📱</div>
              <h3 className="font-semibold text-gray-800">Scan QR</h3>
              <p className="text-sm text-gray-600">Validate tickets via QR</p>
            </button>
            
            <button className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-center">
              <div className="text-3xl mb-2">🔍</div>
              <h3 className="font-semibold text-gray-800">Search Ticket</h3>
              <p className="text-sm text-gray-600">Find ticket by code</p>
            </button>
            
            <button className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-center">
              <div className="text-3xl mb-2">📋</div>
              <h3 className="font-semibold text-gray-800">Reports</h3>
              <p className="text-sm text-gray-600">View detailed reports</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}