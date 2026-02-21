import { Link } from 'react-router-dom'
import { ACESSO_RAPIDO } from './Home.js'
import './Home.css'

function Home() {
  return (
    <section className="home-page">
      <div className="home-quick-grid">
        {ACESSO_RAPIDO.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              className="home-quick-card"
            >
              <span className="home-quick-card__icon" aria-hidden>
                <Icon />
              </span>
              <h2 className="home-quick-card__title">{item.title}</h2>
              <p className="home-quick-card__desc">{item.desc}</p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default Home
