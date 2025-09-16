export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            🎫 Ticket War MVP
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Sistem Tiket Acara Kampus
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👨‍🎓</span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Login Mahasiswa
              </h2>
              <p className="text-gray-600 mb-6">
                Masuk untuk mengambil tiket acara kampus
              </p>
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                Masuk sebagai Mahasiswa
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🛡️</span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Panel Admin
              </h2>
              <p className="text-gray-600 mb-6">
                Kelola acara dan validasi tiket
              </p>
              <button className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors">
                Masuk sebagai Admin
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-16 text-center">
          <div className="bg-white rounded-lg p-6 inline-block shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Status Sistem</h3>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Database Terhubung</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}