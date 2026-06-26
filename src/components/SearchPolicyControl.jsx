function getFuzzinessDescription(fuzziness) {
  if (fuzziness === 0) {
    return 'strict'
  }

  if (fuzziness === 100) {
    return 'fully fuzzy'
  }

  return 'fuzzy'
}

function SearchPolicyControl({ fuzziness, onChange }) {
  const description = getFuzzinessDescription(fuzziness)

  return (
    <div className='search-policy-control'>
      <div className='search-policy-control__heading'>
        <label className='form-label fw-semibold mb-0' htmlFor='search-fuzziness'>
          Search fuzziness
        </label>
        <output className='search-policy-control__value' htmlFor='search-fuzziness' aria-live='polite'>
          {fuzziness}% fuzzy
        </output>
      </div>

      <input
        id='search-fuzziness'
        className='form-range'
        type='range'
        min='0'
        max='100'
        step='1'
        value={fuzziness}
        aria-valuetext={`${fuzziness} out of 100, ${description}`}
        onChange={(event) => onChange(Number(event.target.value))}
      />

      <div className='search-policy-control__labels' aria-hidden='true'>
        <span>Strict</span>
        <span>Fuzzy</span>
      </div>
    </div>
  )
}

export default SearchPolicyControl
