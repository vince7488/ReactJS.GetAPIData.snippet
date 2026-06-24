import { useState } from 'react';
import ProfileList from './components/ProfileList';
import SearchForm from './components/SearchForm';

function App() {
  const [profiles, setProfiles] = useState([]);

  function addProfile(profile) {
    setProfiles((currentProfiles) => [...currentProfiles, profile]);
  }

  return (
    <main className="app-shell">
      <section className="container-fluid py-4 py-md-5">
        <h1 className="mb-4 text-center">
          React: Demonstrating API Data Retrieval
        </h1>
        <SearchForm onProfileFound={addProfile} />
        <ProfileList profiles={profiles} />
      </section>
    </main>
  );
}

export default App;
