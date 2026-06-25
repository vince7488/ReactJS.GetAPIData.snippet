function ProviderSelector({ providers, selectedProviderId, onChange }) {
  return (
    <div className='provider-selector'>
      <label className='form-label fw-semibold' htmlFor='provider'>
        API provider
      </label>
      <select id='provider' className='form-select' value={selectedProviderId} onChange={(event) => onChange(event.target.value)}>
        {providers.map((provider) => (
          <option key={provider.id} value={provider.id}>
            {provider.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export default ProviderSelector
