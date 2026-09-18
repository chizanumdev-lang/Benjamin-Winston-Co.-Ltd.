import ProductCard from './ProductCard.jsx'

export default function ProductGrid({ products }) {
  if (products.length === 0) {
    return (
      <div className="empty-state">
        <p>No products match your search.</p>
      </div>
    )
  }

  return (
    <div className="results">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
