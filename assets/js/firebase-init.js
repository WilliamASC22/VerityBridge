(function () {
  var firebaseConfig = {
    apiKey: "AIzaSyBQKRlkEbrsN5hiVJi6FR_OYTA6sDBkang",
    authDomain: "veritybridge-database.firebaseapp.com",
    projectId: "veritybridge-database",
    storageBucket: "veritybridge-database.firebasestorage.app",
    messagingSenderId: "642260239334",
    appId: "1:642260239334:web:dd6a3893057728658f4c27",
    measurementId: "G-8JLY0TJ9KT" // optional (analytics only)
  };

  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }

  window.firebaseApp = firebase.app();
  window.auth = firebase.auth();
  window.db = firebase.firestore();
})();
