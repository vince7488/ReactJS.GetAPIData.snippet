import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MasonryGrid from './MasonryGrid'

const { masonryMock } = vi.hoisted(() => ({
  masonryMock: vi.fn(),
}))

vi.mock('masonic', () => ({
  Masonry(props) {
    masonryMock(props)

    const RenderComponent = props.render

    return (
      <div className={props.className} role={props.role}>
        {props.items.map((item, index) => (
          <div key={props.itemKey(item, index)} role='listitem'>
            <RenderComponent data={item} index={index} width={360} />
          </div>
        ))}
      </div>
    )
  },
}))

function createResult(index) {
  return {
    id: `result:${index}`,
    title: `Result ${index}`,
    subtitle: `@result-${index}`,
    description: `Description ${index}`,
    imageUrl: null,
    externalUrl: `https://example.com/result-${index}`,
    metadata: [{ label: 'Index', value: String(index) }],
  }
}

describe('MasonryGrid', () => {
  it('renders result cards through Masonic virtualized masonry', () => {
    render(<MasonryGrid results={[createResult(1), createResult(2)]} externalLinkLabel='View result' columnCount={3} />)

    expect(screen.getByRole('list')).toHaveClass('masonry-grid')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Result 1')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'View result' })).toHaveLength(2)
  })

  it('caps Masonic to three masonry columns while allowing responsive column sizing', () => {
    render(<MasonryGrid results={[createResult(1)]} externalLinkLabel='View result' columnCount={3} />)

    expect(masonryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        columnGutter: 16,
        columnWidth: 360,
        itemHeightEstimate: 520,
        maxColumnCount: 3,
        overscanBy: 2,
        role: 'list',
        rowGutter: 16,
      }),
    )
  })
})
