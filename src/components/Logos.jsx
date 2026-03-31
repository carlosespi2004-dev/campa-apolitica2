import anrlogo from "../img/anrlogo.png";
import logocarmona from "../img/logocarmona.png";

export function ANRLogo() {
  return (
    <img
      src={anrlogo}
      alt="Logo Oficial"
      style={{
        width: "100px",
        height: "100px",
        borderRadius: "50%",
        objectFit: "cover"
      }}
    />
  );
}

export function GreenHeart() {
  return (
    <img
      src={logocarmona}
      alt="Logo Carmona"
      style={{ width: "50px", height: "50px", borderRadius: "10px" }}
    />
  );
}