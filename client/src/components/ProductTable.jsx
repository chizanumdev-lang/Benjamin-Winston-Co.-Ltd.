import { formatNaira, formatUnit } from '../format.js'

// Rows arrive ordered by category when `grouped` is set (the default sort with
// no search), so consecutive rows can be folded into category sections.
function groupByCategory(products) {
  const groups = []
  for (const p of products) {
    const last = groups[groups.length - 1]
    if (last && last.category === p.category) last.items.push(p)
    else groups.push({ category: p.category, items: [p] })
  }
  return groups
}

function ProductRow({ product, showCategory, isNew }) {
  const measured = product.unit && product.unit.toLowerCase() !== 'each'
  return (
    <tr className={isNew ? 'is-new' : undefined} data-product-id={product.id}>
      <td className="cell-desc">
        <span className="desc">{product.description}</span>
        {product.is_custom && <span className="tag-custom">Custom</span>}
        {showCategory && <span className="row-category">{product.category}</span>}
      </td>
      <td className="cell-code">{product.code}</td>
      <td className="cell-price">{formatNaira(product.price)}</td>
      <td className={measured ? 'cell-unit is-measured' : 'cell-unit'}>{formatUnit(product.unit)}</td>
    </tr>
  )
}

export default function ProductTable({ products, grouped, showCategory, newId }) {
  return (
    <table className="price-table">
      <colgroup>
        <col className="col-desc" />
        <col className="col-code" />
        <col className="col-price" />
        <col className="col-unit" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">Item</th>
          <th scope="col">Code</th>
          <th scope="col" className="cell-price">Price</th>
          <th scope="col">Unit</th>
        </tr>
      </thead>
      {grouped ? (
        groupByCategory(products).map((group) => (
          <tbody key={group.category}>
            <tr className="group-row">
              <th colSpan={4} scope="rowgroup">
                {group.category}
                <span className="group-count">{group.items.length}</span>
              </th>
            </tr>
            {group.items.map((p) => (
              <ProductRow key={p.id} product={p} showCategory={false} isNew={p.id === newId} />
            ))}
          </tbody>
        ))
      ) : (
        <tbody>
          {products.map((p) => (
            <ProductRow key={p.id} product={p} showCategory={showCategory} isNew={p.id === newId} />
          ))}
        </tbody>
      )}
    </table>
  )
}
