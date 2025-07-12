import Link from "next/link"
import { Mountain } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center space-y-8 p-8">
          {/* Logo Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-24 h-24 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
              <Mountain className="w-12 h-12 text-primary-foreground" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">RentEase</h1>
            <p className="text-lg text-slate-600 max-w-md">Simplifying property rentals for landlords and tenants</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="w-full sm:w-auto min-w-[120px]">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto min-w-[120px] bg-transparent">
              <Link href="/register">Register</Link>
            </Button>
          </div>

          {/* Optional subtitle */}
          <div className="text-sm text-slate-500 mt-8">
            New to RentEase? Register as a tenant to find your perfect rental
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <p className="text-sm text-slate-600">© 2024 RentEase. All rights reserved.</p>
      </footer>
    </div>
  );
}
