import React, { useState } from "react"; //specify useState
import ReactDOM from "react-dom";
import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

function AppContainer() {

    return (
      <section className="container">
        <h1 class="text-center">Initialising Bootstrap HTML</h1>
        <div class="alert alert-info">
            We're now ready to start building
        </div>
      </section>
    );

}

/* Start Rendering */

ReactDOM.render(<AppContainer />, document.getElementById("reactMain"));
