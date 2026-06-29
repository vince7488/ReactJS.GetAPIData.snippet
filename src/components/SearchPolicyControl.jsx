import { getSearchMatchLevel } from '../utils/searchPolicy'

function SearchPolicyControl({ matchLevel, onChange }) {
  const level = getSearchMatchLevel(matchLevel)

  return (
    <div className='search-policy-control'>
      <div className='search-policy-control__heading'>
        <label className='form-label fw-semibold mb-0' htmlFor='search-match-level'>
          Search match level
        </label>
        <output className='search-policy-control__value' htmlFor='search-match-level' aria-live='polite'>
          Level {level.value}: {level.label}
        </output>
      </div>

      <input
        id='search-match-level'
        className='form-range'
        type='range'
        min='0'
        max='4'
        step='1'
        value={level.value}
        aria-valuetext={`Level ${level.value} of 4, ${level.label}: ${level.description}`}
        onChange={(event) => onChange(Number(event.target.value))}
      />

      <div className='search-policy-control__labels' aria-hidden='true'>
        <span>Strict</span>
        <span>Lenient</span>
      </div>
    </div>
  )
}

export default SearchPolicyControl
