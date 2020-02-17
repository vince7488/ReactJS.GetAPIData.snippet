import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import "bootstrap";
import 'bootstrap/dist/css/bootstrap.min.css';
import {
  Button,
  Container,
  Row,
  InputGroup,
  FormControl,
  CardColumns,
  Card,
} from 'react-bootstrap';
import Axios from 'axios';
import "./styles/main.less";
import Icon from "./favicon.ico";

const CardList = (props) => ( 
  <Row className="justify-content-around align-items-baseline flex-sm-row flex-sm-wrap" role="list">
    { props.profiles.map( (profile, index) => 
    <GitHubCard key = { profile.id } { ...profile } /> )} 
  </Row>
  //  remember to set key={profile.someSortOfUniqueKey}
  //  NOTE::: without the (profile,index) and key={profile.name} the
  //  original code:
  //  (profile) => <GitHubCard {...profile} />
  //  Produces the error: #Each child in a list should have a unique "key" prop.#
);

class GitHubCard extends React.Component {

  render() {
    const profile = this.props;
    let imgURL = (profile.avatar_url != null) ? profile.avatar_url : '//placehold.it/75';
    let profName = (profile.name != null) ? profile.name : 'User Full Name not Set';
    let profCpy = (profile.company != null) ? profile.company : 'Company Name Not Set';
    let extURL = (profile.html_url != null) ? profile.html_url : 'https://github.com'; //this is almost never null

    return (
      <div className="col-sm-6 col-md-6 col-lg-4 p-1">
        <Row className="profile-card justify-content-between align-items-center m-3 p-1">
          <figure className="logo col-4">
            <img src={imgURL} alt={profName} />
          </figure>
          <div className="col-8 text-center">
            <h6>{profName}</h6>
            <span className="loginid">{profile.login}</span>
            <div className="text-center">
              <span className="comapny-name">{profCpy}</span>
            </div>
            <Button href={extURL} title={profName} target="_blank" variant="link" rel="external" block>Go to Profile</Button>
          </div>
        </Row>
      </div>
    );
  }
}

class SearchIndexer extends React.Component {

  state = {userName:"",error: null}

  handleSubmit = async (event) => {
    event.preventDefault()
    await Axios.get(`//api.github.com/users/${this.state.userName}`)
    .then(
      (apiResponse) => { this.props.onSubmit(apiResponse.data) }

    ).catch(
      (error) => {
        console.log(error);
        this.setState( { error } );
      }
    )
  };

  render() {

    return (
      <Row className="justify-content-center">
        <div className="col-md-6">
          <div style={(this.state.error) ? {display:"block",margin:"0px auto 15px"} : {display:'none'}}>
            <span className="alert alert-danger boxify">
              Something went wrong, the username can't be found.
            </span>
          </div>

          <form onSubmit={this.handleSubmit}>
          <InputGroup className="mb-3">
            <InputGroup.Prepend>
              <InputGroup.Text id="GitHubUserEntry">
                GitHub.com/
              </InputGroup.Text>
            </InputGroup.Prepend>

            <FormControl
            type="text"
            placeholder="Username"
            aria-label="Username"
            value={this.state.userName}
            onChange={
              event => this.setState(
                {
                  userName: event.target.value,
                  error: null,
                }
              )
            }
            required
            />

            <InputGroup.Append>
              <Button type="submit" variant="outline-primary">Search</Button>
            </InputGroup.Append>
          </InputGroup>
          </form>
        </div>
      </Row>

    );
  }
}

class AppObject extends React.Component {
    // classic method
    // constructor (props) {
    //  	super(props);
    //  	this.state = {
    //  		profiles: getData,
    //  	}
	  // }
	state = {
		profiles : [],
	}

	addNewProfile = (profileData) => {

		this.setState(prevState => ({
			profiles: [...prevState.profiles, profileData],
		}))
		console.log('GitHubApp',profileData);

	}

    render() {
      return (
        <Container fluid as="section">
          <h1 className="text-center">React: Demonstrating API Data Retrieval</h1>

          <SearchIndexer onSubmit={this.addNewProfile} />
          <CardList profiles={this.state.profiles} />

        </Container>
      );
    }
  }

function AppContainer() {
  
  return (
    < AppObject />
  );

}

/* Start Rendering */

ReactDOM.render(<AppContainer />, document.getElementById("reactMain"));
