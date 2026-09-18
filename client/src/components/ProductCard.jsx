const currency = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
})

export default function ProductCard({ product }) {
  return (
    <article className="product-card">
      <span className="product-category">{product.category}</span>
      <h3 className="product-desc">{product.description}</h3>
      {product.code ? <span className="product-code">{product.code}</span> : null}
      <div className="product-footer">
        <span className="product-price">{currency.format(product.price)}</span>
        <span className="product-unit">{product.unit}</span>
      </div>
    </article>
  )
}
