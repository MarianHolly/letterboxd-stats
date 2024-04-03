import Link from "next/link";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./ui/navigation-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { Button } from "./ui/button";
import { BookIcon, ShoppingBasketIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Header() {
  return (
    <header className="supports-backdrop-blur:bg-background/90 sticky top-0 z-50 w-full border-b bg-background/90 backdrop-blur mb-4 px-[1.4rem] md:px-[4rem] lg:px-[6rem] xl:px-[8rem] 2xl:px-[12rem]">
      <div className="flex h-14 items-center">
        <MainNav />
        <div className="flex flex-1 items-center space-x-2 justify-end">
          <div className="flex-none">
            <CommandMenu />
          </div>
          <CartNav />
        </div>
      </div>
    </header>
  );
}

function MainNav() {
  return (
    <div className="flex gap-4">
      <Link href="/" className="flex items-center">
        <span className="hidden font-medium sm:inline-block">
          The Bookish Retreat
        </span>
      </Link>
      <NavMenu />
    </div>
  );
}

function NavMenu() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavLink to="/products">
            <NavigationMenuLink className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-2 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50">
              <div className="font-normal text-foreground/70">Products</div>
            </NavigationMenuLink>
          </NavLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>
            <div className="font-normal text-foreground/70">Categories</div>
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
              <li className="row-span-3">
                <NavigationMenuLink asChild>
                  <Link
                    className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                    to="/products"
                  >
                    <div className="mb-2 mt-4 text-lg font-medium">
                      The Bookish Retreat
                    </div>
                    <p className="text-sm leading-tight text-muted-foreground">
                      Step into our realm of boundless imagination and let the
                      magic of literature awaken your spirit.
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
              <ListItem href="/category/fiction" title="Fiction">
                Dive into worlds of imagination and creativity with our fiction
                collection.
              </ListItem>
              <ListItem href="/category/poetry" title="Poetry">
                Let your soul be stirred and your heart moved by the power of
                poetry.
              </ListItem>
              <ListItem href="/category/essays" title="Essays">
                Expand your mind and enrich your understanding with our
                thought-provoking essays.
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function ListItem({ className, title, children, href, ...props }) {
  return (
    <li>
      <NavigationMenuLink asChild>
        <NavLink
          to={href}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </NavLink>
      </NavigationMenuLink>
    </li>
  );
}

function CommandMenu() {}
export function CartNav() {}
