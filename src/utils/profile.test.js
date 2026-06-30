import { describe, expect, it } from 'vitest'
import { isDisplayResult } from './profile'

describe('isDisplayResult', () => {
  it('accepts the shared display model', () => {
    expect(
      isDisplayResult({
        id: 'provider:1',
        title: 'Result',
        subtitle: 'Subtitle',
        description: 'Description',
        imageUrl: null,
        externalUrl: 'https://example.com',
        metadata: [{ label: 'Type', value: 'Example' }],
      }),
    ).toBe(true)
  })

  it('rejects incomplete display models', () => {
    expect(
      isDisplayResult({
        id: 'provider:1',
        title: 'Result',
      }),
    ).toBe(false)
  })
})
