# Nginx_Audio_Playlist

This is a drop in website to accompany your music tracks that you're sharing via Nginx.

My motivation here was that I have writing an album and I like to listen to the latest bounces when I'm on-the-go, in a normal playlist fashion.  I got sick of transferring the files to my phone over and over. So now I just bounce the tracks directly to this folder and they're automatically available on this website I can access anywhere.

To help with the mixing / mastering process, it has a waveform visualizer, FFT frequency analysis, and shows volume over time in DB. 

It looks like this:

![image](https://github.com/user-attachments/assets/418d131f-faad-4381-90ea-ea6a89c013d6)

## Note

this thing was vibe coded in cursor. I take no responsibility for any code quality or lack thereof. 

## Filesystem setup

1. Make a parent folder somewhere containing all your playlists (`/path/to/shared_music`)
2. Make a new folder for your first playlist, (`/path/to/shared_music/playlist1`), I'll refer to this as `<playlist folder>`
3. Make a new folder in there for tracks (and add mp3 or wav files in there) (`<playlist folder>/tracks`)
4. Clone the contents of this repo into `<playlist folder>` using
   ```
   git init
   git remote add origin git@github.com:MaxPleaner/Nginx_Audio_Playlist.git
   git pull origin master --allow-unrelated-histories
   ```
 5. Your playlist folder should now look like this:
  
![image](https://github.com/user-attachments/assets/fddce712-7e75-4b38-bf28-e8deceeff981)


## Nginx setup (example)

```nginx
server {
  # ... your existing server stuff goes here ...
  location /shared_music { return 301 /shared_music/; }
  location /shared_music/ {
    autoindex on;
    alias /path/to/shared_music;
  }
}
```

Then, when the user goes to `yourwebsite.com/shared_music`, they'll see a standard Nginx autoindex page. Clicking into one of the playlist folders will show the custom website. The track list is auto-populated. 



