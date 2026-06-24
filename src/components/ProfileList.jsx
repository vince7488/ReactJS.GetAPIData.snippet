import ProfileCard from './ProfileCard';

function ProfileList({ profiles }) {
  return (
    <div
      className="row justify-content-around align-items-stretch"
      aria-live="polite"
      aria-label="GitHub profiles"
    >
      {profiles.map((profile, index) => (
        <ProfileCard key={`${profile.id}-${index}`} profile={profile} />
      ))}
    </div>
  );
}

export default ProfileList;
