const loader = document.querySelector(".loader");
const fragment = new URLSearchParams(window.location.hash.slice(1));
const access_token = fragment.get("access_token");

fetch("http://localhost:5173/token/", {
  method: "POST",
  body: JSON.stringify({
    code: access_token,
  }),
  headers: {
    "Content-Type": "application/json",
  },
}).then((res) => {
  loader.remove();
  const span = document.createElement("span");
  span.innerHTML = "You can close this window";
  document.body.appendChild(span);
});
