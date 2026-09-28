export default function ReturnRefundCancellationPolicyPage() {
  return (
    <div className="bg-ivory min-h-screen py-20">
      <div className="container mx-auto px-6 max-w-4xl">
        <h1 className="text-4xl font-playfair font-bold text-deep-purple mb-10 text-center">Return, Refund & Cancellation Policy</h1>
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm mb-8 text-center italic">Last Updated: 08th May 2026</p>
          
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-deep-purple mb-4">1. Order Cancellation</h2>
            <div className="bg-ivory p-6 rounded-xl border border-gray-100 mb-4">
              <p className="text-gray-700 leading-relaxed mb-2">Orders can be cancelled <strong>only before they are dispatched</strong>. Once an order has been dispatched, it cannot be cancelled.</p>
              <ul className="list-disc list-inside text-gray-700 leading-relaxed ml-4">
                <li>Login to your account and manage your order, OR</li>
                <li>Contact our support team immediately.</li>
              </ul>
            </div>
            <p className="text-gray-600 text-sm italic">
              * MeruVeda reserves the right to cancel orders due to incorrect pricing, product unavailability, suspicious transactions, incomplete customer information, or unserviceable delivery locations.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-deep-purple mb-4">2. Return Policy</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Due to hygiene, safety, and wellness-related reasons, all MeruVeda products are <strong>non-returnable</strong> by default. However, replacement or refund requests may be considered in the following cases:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                <span className="block text-red-600 font-bold mb-2">Wrong Product</span>
                <p className="text-xs text-red-800">You received a different item than what you ordered.</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-center">
                <span className="block text-orange-600 font-bold mb-2">Damaged Product</span>
                <p className="text-xs text-orange-800">The product arrived broken, leaking, or tampered with.</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-center">
                <span className="block text-yellow-600 font-bold mb-2">Expired Product</span>
                <p className="text-xs text-yellow-800">The product you received is past its expiration date.</p>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-deep-purple mb-4">3. Claim Process</h2>
            <ol className="list-decimal list-inside text-gray-700 leading-relaxed space-y-3">
              <li><strong>Contact us</strong> within 7 days of delivery.</li>
              <li><strong>Share clear unboxing video and images</strong> showing the outer packaging, shipping label, received product, and the specific issue/damage.</li>
              <li><strong>Verification:</strong> All requests are subject to internal verification by our team. Claims without proper proof may not be accepted.</li>
            </ol>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <section>
              <h2 className="text-2xl font-bold text-deep-purple mb-4">4. Refund Policy</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                Approved refunds will be processed within <strong>10 business days</strong> to the original payment method.
              </p>
              <p className="text-gray-700 leading-relaxed text-sm">
                For Cash on Delivery orders, customers may be asked to provide bank account details for refund processing. MeruVeda reserves the right to reject claims that appear fraudulent or unsupported.
              </p>
            </section>
            <section>
              <h2 className="text-2xl font-bold text-deep-purple mb-4">5. Replacement Policy</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                Eligible replacement requests will be processed after verification and subject to product availability.
              </p>
              <p className="text-gray-700 leading-relaxed text-sm">
                Replacement timelines may vary depending on your delivery location and logistics availability.
              </p>
            </section>
          </div>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-deep-purple mb-4">6. Non-Acceptable Claims</h2>
            <p className="text-gray-700 leading-relaxed mb-4">Refunds or replacements will <strong>not</strong> be applicable for:</p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700 leading-relaxed text-sm">
              <li className="flex items-center gap-2"><span className="text-red-500">✖</span> Opened or used products</li>
              <li className="flex items-center gap-2"><span className="text-red-500">✖</span> Minor packaging variations</li>
              <li className="flex items-center gap-2"><span className="text-red-500">✖</span> Personal taste or fragrance preferences</li>
              <li className="flex items-center gap-2"><span className="text-red-500">✖</span> Delayed delivery by logistics providers</li>
              <li className="flex items-center gap-2"><span className="text-red-500">✖</span> Allergic reactions (please review ingredients carefully)</li>
              <li className="flex items-center gap-2"><span className="text-red-500">✖</span> Incorrect product usage</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-purple mb-4">Contact Us</h2>
            <div className="bg-ivory p-6 rounded-xl inline-block border border-gray-100 w-full md:w-auto">
              <p className="text-gray-600 mb-2">For refund or return assistance, please reach out to our support team:</p>
              <p className="text-deep-purple font-bold text-lg"><a href="mailto:customercare@meruvedawellness.com" className="hover:text-gold transition-colors">customercare@meruvedawellness.com</a></p>
              <p className="text-deep-purple font-semibold mt-1">WhatsApp: <a href="https://wa.me/918097147463" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">+91 8097147463</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
