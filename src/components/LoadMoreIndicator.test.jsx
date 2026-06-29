import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import LoadMoreIndicator from './LoadMoreIndicator'

describe('LoadMoreIndicator', () => {
  it('announces the paced reveal state with Bootstrap spinner markup', () => {
    render(<LoadMoreIndicator />)

    expect(screen.getByRole('status')).toHaveTextContent('loading more')
    expect(screen.getByRole('status').querySelector('.spinner-border')).toBeInTheDocument()
  })
})
