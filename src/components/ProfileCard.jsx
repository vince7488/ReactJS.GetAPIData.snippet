import { getProfileDisplayData } from '../utils/profile';

function ProfileCard({ profile }) {
  const { avatarUrl, company, name, profileUrl } =
    getProfileDisplayData(profile);

  return (
    <article className="col-12 col-sm-6 col-lg-4 p-2">
      <div className="profile-card row align-items-center g-0 h-100 p-2">
        <figure className="col-4 mb-0 pe-2">
          <img
            className="profile-avatar"
            src={avatarUrl}
            alt={`${name}'s avatar`}
          />
        </figure>
        <div className="col-8 text-center">
          <h2 className="profile-name">{name}</h2>
          <div className="profile-login">@{profile.login}</div>
          <div className="profile-company">{company}</div>
          <a
            className="btn btn-link"
            href={profileUrl}
            title={name}
            target="_blank"
            rel="noreferrer"
          >
            Go to Profile
          </a>
        </div>
      </div>
    </article>
  );
}

export default ProfileCard;
