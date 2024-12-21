'use client'

import { Mail } from 'lucide-react'
import { motion, useAnimation } from "framer-motion"
import { useEffect, useMemo } from 'react'

export function FooterContent() {
  const footerControls = useAnimation();
  const createdByControls = useAnimation();
  const teamControls = useAnimation();
  const builtWithControls = useAnimation();

  const controls = useMemo(() => ({
    footer: footerControls,
    createdBy: createdByControls,
    team: teamControls,
    builtWith: builtWithControls
  }), [footerControls, createdByControls, teamControls, builtWithControls]);

  useEffect(() => {
    const startAnimations = async () => {
      await controls.footer.start({ opacity: 1, y: 0 })
      await controls.createdBy.start({ opacity: 1, x: 0 })
      await controls.team.start({ opacity: 1, x: 0 })
      await controls.builtWith.start({ opacity: 1, scale: 1 })
    }

    startAnimations()
  }, [controls])

  return (
    <motion.footer 
      initial={{ opacity: 0, y: 20 }}
      animate={controls.footer}
      transition={{ duration: 1.2 }}
      className="w-full border-t bg-white dark:bg-slate-950"
    >
      <div className="container flex flex-col items-center justify-center gap-4 py-4 md:h-20 md:flex-row md:py-0">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={controls.createdBy}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <span>Created by</span>
          <a 
            href="mailto:andriimazurenko99@gmail.com"
            className="flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors"
          >
            @Andrii Mazurenko
            <Mail className="h-3 w-3" />
          </a>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={controls.team}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <span>for Balemala team</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={controls.builtWith}
          transition={{ duration: 1.0 }}
          className="flex items-center gap-2 text-sm"
        >
          <span>Built with</span>
          <svg viewBox="0 0 207 124" version="1.1" fill="#000000" className="h-[20px] sm:h-[30px] dark:fill-white">
            {/* SVG content */}
          </svg>
        </motion.div>
      </div>
    </motion.footer>
  )
} 