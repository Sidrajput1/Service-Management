"use client";
import { useTheme } from 'next-themes';
import React from 'react'
import { Button } from './ui/button';
import { Sun,Moon } from 'lucide-react';

function ThemeToggler() {
    const {theme,setTheme} = useTheme();
    const [mounted,setMounted] = React.useState(false);
     React.useEffect(() => {
        setMounted(true);
    },[]);

    if(!mounted){
        return null;
    }
  return (
    <Button
      variant="default"
      size="icon"
      onClick={() =>
        setTheme(theme === "dark" ? "light" : "dark")
      }
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  )
}

export default ThemeToggler