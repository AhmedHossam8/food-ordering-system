import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🍽️</span>
              <span className="text-lg font-bold text-primary-600">FoodOrder</span>
            </div>
            <p className="text-sm text-text-secondary">
              Delicious food, delivered fast. Order your favorite meals online.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-text-primary mb-3">Quick Links</h4>
            <div className="space-y-2 text-sm text-text-secondary">
              <Link href="/menu" className="block hover:text-primary-600">Menu</Link>
              <Link href="/cart" className="block hover:text-primary-600">Cart</Link>
              <Link href="/orders" className="block hover:text-primary-600">Orders</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-text-primary mb-3">Contact</h4>
            <div className="space-y-2 text-sm text-text-secondary">
              <p>support@foodorder.com</p>
              <p>+1 (555) 123-4567</p>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border text-center text-sm text-text-muted">
          &copy; {new Date().getFullYear()} FoodOrder. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
