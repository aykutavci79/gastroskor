import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About - Skin and Bone',
  description: 'Learn about deri and kemik, Turkish short story writers exploring the human condition.',
}

export default function EnglishAboutPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary">
            About Skin and Bone
          </h1>
          <p className="text-xl text-muted-foreground font-serif italic">
            Two voices, one literary vision
          </p>
        </header>

        <section className="prose prose-lg max-w-none space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl font-serif font-bold text-primary">Our Philosophy</h2>
            <p className="text-foreground/80 leading-relaxed">
              Skin and Bone is a literary platform dedicated to exploring the depths of human 
              experience through contemporary Turkish short fiction. We believe that stories 
              have the power to reveal truths that lie beneath the surface of everyday life—the 
              hidden layers of memory, identity, and transformation that shape who we are.
            </p>
            <p className="text-foreground/80 leading-relaxed">
              Through the complementary voices of our two authors, we examine the duality of 
              existence: the soft and the hard, the visible and the hidden, the fleeting and 
              the permanent. Like skin and bone, these elements are inseparable, each giving 
              meaning to the other.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4 p-6 bg-muted/30 rounded-lg">
              <h3 className="text-2xl font-serif font-bold text-primary">deri (Skin)</h3>
              <p className="text-foreground/80 leading-relaxed">
                deri's stories explore the fragile boundaries between reality and perception, 
                crafting psychological narratives that delve into the complexities of human 
                consciousness. With a focus on character-driven tales, deri examines how we 
                construct and reconstruct our identities, often in the face of trauma, loss, 
                and transformation.
              </p>
              <p className="text-foreground/80 leading-relaxed">
                The stories are characterized by their intimate voice, exploring themes of 
                dissociation, memory, obsession, and the search for meaning in a world that 
                often defies rational understanding.
              </p>
            </div>

            <div className="space-y-4 p-6 bg-muted/30 rounded-lg">
              <h3 className="text-2xl font-serif font-bold text-primary">kemik (Bone)</h3>
              <p className="text-foreground/80 leading-relaxed">
                kemik's stories are forthcoming. Where skin is surface and sensation, bone 
                represents structure and endurance. kemik's narratives will examine the 
                frameworks that hold us together—the social, familial, and existential 
                structures that define our existence—and the moments when these frameworks 
                crack or crumble.
              </p>
              <p className="text-foreground/80 leading-relaxed italic text-muted-foreground">
                New stories coming soon...
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-8 border-t border-primary/10">
            <h2 className="text-3xl font-serif font-bold text-primary">Why English?</h2>
            <p className="text-foreground/80 leading-relaxed">
              While these stories originate in Turkish, we believe in the universal power 
              of narrative. By offering English translations, we hope to share these 
              explorations of the human condition with a global audience, bridging 
              linguistic and cultural boundaries through the timeless medium of short fiction.
            </p>
            <p className="text-foreground/80 leading-relaxed">
              Each story maintains its cultural authenticity while striving for accessibility, 
              preserving the nuances of the Turkish literary tradition while speaking to 
              universal human experiences.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
