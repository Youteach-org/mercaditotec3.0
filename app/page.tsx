export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-md text-center space-y-4 max-w-md w-full">
        <h1 className="text-4xl font-bold text-gray-900">Mercadito Tec 3.0</h1>
        <p className="text-gray-700">Compra, venta y chat escolar.</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-xl">
            Login
          </a>
          <a href="/register" className="bg-slate-800 text-white px-4 py-2 rounded-xl">
            Registro
          </a>
          <a href="/chat" className="bg-violet-600 text-white px-4 py-2 rounded-xl">
            Chat
          </a>
          <a href="/mystore" className="bg-emerald-600 text-white px-4 py-2 rounded-xl">
            myStores
          </a>
          <a href="/profile" className="bg-amber-600 text-white px-4 py-2 rounded-xl">
            Perfil
          </a>
        </div>
      </div>
    </main>
  );
}

